async function execute({ type, model, prompt, inputs, duration, index }) {
  // Simulate job submission to AI API (network round-trip)
  await new Promise(r => setTimeout(r, 200));
  console.log(`[mock] Job submitted — type: ${type}, index: ${index ?? 0}`);

  // Simulate polling for result (real APIs like Runway require polling)
  for (let poll = 1; poll <= 3; poll++) {
    await new Promise(r => setTimeout(r, 300));
    console.log(`[mock] Polling ${poll}/3 — index ${index ?? 0}`);
  }

  const url = `s3://mock-bucket/${type}-${Date.now()}-${index ?? 0}.jpg`;
  console.log(`[mock] Result ready → ${url}`);
  return url;
}

module.exports = { execute };