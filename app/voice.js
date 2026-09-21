export function buildVoiceSentence(result, sentences) {
  if (!result || !Number.isFinite(result.measuredCount) || result.measuredCount < 1 || !result.quality) return '';

  const quality = sentences.quality[result.quality] || result.quality;
  const parts = [quality];
  result.problems.forEach((problem) => {
    const name = sentences.problemNames[problem.name] || problem.name;
    const advice = sentences.problemAdvice[problem.advice] || problem.advice;
    parts.push(`${name}. ${advice}`);
  });
  if (!result.problems.length) parts.push(sentences.noProblem);
  if (result.limited) parts.push(sentences.limited);
  return parts.join(' ');
}
