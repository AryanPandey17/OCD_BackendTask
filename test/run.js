const { runWorkflow } = require('../engine/workflowRunner');

const template = {
    templateId: 'test-001',
    workflow: {
        steps: [
            {
                stepId: 's1', label: 'Hero shot',
                type: 'image_generation', provider: 'mock',
                executionType: 'single',
                inputs: {
                    ref: '{{userUpload}}',
                    ratio: '{{userInputs.aspectRatio}}',
                },
                prompt: 'Product photo {{userInputs.aspectRatio}} ratio',
                outputKey: 'heroShot',
            },
            {
                stepId: 's2', label: 'Lifestyle shots',
                type: 'image_generation', provider: 'mock',
                executionType: 'parallel', parallelCount: 3,
                inputs: { ref: '{{userUpload}}' },
                prompt: '{{userInputs.modelGender}} model with product',
                outputKey: 'lifestyleShots',
            },
            {
                stepId: 's3', label: 'Product video',
                type: 'image_to_video', provider: 'mock',
                executionType: 'single',
                inputs: { src: '{{steps.s1.heroShot}}' },
                prompt: 'Cinematic 360 rotation',
                duration: 5,
                outputKey: 'productVideo',
            },
        ],
        executionOrder: [
            ['s1'],
            ['s2', 's3'],
        ],
        outputSchema: [
            { key: 's1.heroShot', type: 'image', label: 'Hero Shot' },
            { key: 's2.lifestyleShots', type: 'image[]', label: 'Lifestyle Shots' },
            { key: 's3.productVideo', type: 'video', label: 'Product Video' },
        ],
    },
};

const job = {
    jobId: 'job-test-001',
    userId: 'user-123',
    templateId: 'test-001',
    status: 'queued',
    currentTier: 0,
    totalTiers: 2,
    inputFiles: ['s3://user-uploads/user-123/job-001/product.jpg'],
    userInputs: {
        aspectRatio: '9:16',
        modelGender: 'Female',
        modelEthnicity: 'South Asian',
    },
    stepOutputs: {},
    finalOutputs: [],
    createdAt: new Date().toISOString(),
    errorMessage: null,
};

runWorkflow(job, template).then(completed => {
    console.log('\n=== FINAL JOB ===');
    console.log(JSON.stringify(completed, null, 2));
});
