const { execute } = require('./providers/mock');

function resolveReference(ref, job) {
  if (ref === 'userUpload') {
    return job.inputFiles[0];
  }

  if (ref.startsWith('userInputs.')) {
    return job.userInputs[ref.slice('userInputs.'.length)];
  }

  // Handles {{steps.sX.key}} and {{steps.sX.key[N]}}
  if (ref.startsWith('steps.')) {
    const parts = ref.slice('steps.'.length).split('.');
    const stepId = parts[0];
    const rawKey = parts[1];

    const arrayMatch = rawKey.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      return job.stepOutputs[stepId]?.[arrayMatch[1]]?.[parseInt(arrayMatch[2], 10)];
    }
    return job.stepOutputs[stepId]?.[rawKey];
  }

  return undefined;
}

function resolveString(str, job) {
  return str.replace(/\{\{([^}]+)\}\}/g, (_, ref) => {
    const value = resolveReference(ref.trim(), job);
    if (value === undefined) {
      throw new Error(`Variable resolution failed: "{{${ref}}}" could not be resolved.`);
    }
    return value;
  });
}

function resolveInputs(inputs, job) {
  const resolved = {};
  for (const [key, value] of Object.entries(inputs)) {
    resolved[key] = typeof value === 'string' ? resolveString(value, job) : value;
  }
  return resolved;
}

async function executeStep(stepDef, job) {
  console.log(`[step] Executing: "${stepDef.label}" (${stepDef.stepId})`);

  const payload = {
    type: stepDef.type,
    model: stepDef.model,
    prompt: stepDef.prompt ? resolveString(stepDef.prompt, job) : '',
    inputs: resolveInputs(stepDef.inputs, job),
    duration: stepDef.duration,
  };

  if (stepDef.executionType === 'single') {
    const result = await execute({ ...payload, index: 0 });
    return { [stepDef.outputKey]: result };
  }

  if (stepDef.executionType === 'parallel') {
    // Promise.all fires all calls simultaneously — not sequentially
    console.log(`[step] Parallel — firing ${stepDef.parallelCount} calls simultaneously`);
    const results = await Promise.all(
      Array.from({ length: stepDef.parallelCount }, (_, i) =>
        execute({ ...payload, index: i })
      )
    );
    return { [stepDef.outputKey]: results };
  }

  throw new Error(`Unknown executionType: "${stepDef.executionType}" on step ${stepDef.stepId}`);
}

module.exports = { executeStep };