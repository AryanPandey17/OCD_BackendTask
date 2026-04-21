const { executeStep } = require('./stepExecutor');

async function saveCheckpoint(job) {
    await new Promise(r => setTimeout(r, 50));
    console.log('[checkpoint] tier', job.currentTier,
        '— stepOutputs keys:', Object.keys(job.stepOutputs));
}

async function runWorkflow(job, template) {
    const { executionOrder, steps, outputSchema } = template.workflow;

    console.log(`[workflow] Starting job: ${job.jobId} — ${executionOrder.length} tier(s)`);

    try {
        for (let i = 0; i < executionOrder.length; i++) {
            const tier = executionOrder[i];

            // RESUME-FROM-TIER: If all steps in this tier already have outputs, skip to the next tier (handles crash recovery)
            // Skip tiers already completed in a previous run (crash recovery)
            if (tier.every(stepId => job.stepOutputs.hasOwnProperty(stepId))) {
                console.log(`[tier ${i + 1}] Skipping — already completed (resume mode)`);
                continue;
            }

            // BUG 1 FIX: i is 0-based; status string must be 1-based for human readability
            job.currentTier = i + 1;
            job.status = `tier_${i + 1}_of_${executionOrder.length}`;

            console.log(`[tier ${i + 1}/${executionOrder.length}] Starting — steps: [${tier.join(', ')}]`);

            // BUG 2 FIX: for-of with await runs steps sequentially; Promise.all runs them in parallel
            const results = await Promise.all(
                tier.map(stepId => {
                    const stepDef = steps.find(s => s.stepId === stepId);
                    return executeStep(stepDef, job).then(result => ({ stepId, result }));
                })
            );

            // Nest under stepId so {{steps.s1.heroShot}} resolves correctly
            results.forEach(({ stepId, result }) => {
                job.stepOutputs[stepId] = result;
            });

            await saveCheckpoint(job);
        }

        job.finalOutputs = outputSchema.map(o => {
            const [stepId, key] = o.key.split('.');
            return { label: o.label, type: o.type, url: job.stepOutputs[stepId][key] };
        });

        // BUG 3 FIX: Original wiped stepOutputs = {} here, breaking crash recovery and finalOutputs
        job.status = 'completed';
        job.completedAt = new Date().toISOString();

        console.log(`[workflow] Job ${job.jobId} completed — ${job.finalOutputs.length} output(s) ready`);

    } catch (err) {
        job.status = 'failed';
        job.errorMessage = err.message;
        console.error(`[workflow] Job ${job.jobId} FAILED — ${err.message}`);
    }

    return job;
}

module.exports = { runWorkflow };