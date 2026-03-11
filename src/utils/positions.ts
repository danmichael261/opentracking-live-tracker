import { RunnerData, ClassData } from '../types';

function parseElapsedSeconds(t: string): number {
  if (!t) return Infinity;
  const parts = t.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Infinity;
}

export interface PositionResult {
  genderPos: number;
  genderTotal: number;
  overallPos: number;
  overallTotal: number;
  ageGroupPos: number;
  ageGroupTotal: number;
}

export function computePositions(
  target: RunnerData,
  allClasses: ClassData[],
  checkpointOrder: string[],
  targetGenderClass: string
): PositionResult {
  const targetCpIdx = checkpointOrder.indexOf(target.lc);
  const targetTime = parseElapsedSeconds(target.t);
  const targetAG = target.ag || target.g;

  let genderAhead = 0, genderTotal = 0;
  let overallAhead = 0, overallTotal = 0;
  let ageGroupAhead = 0, ageGroupTotal = 0;

  for (const cls of allClasses) {
    const isSameGenderClass = cls.classname === targetGenderClass;

    for (const runner of cls.teams) {
      overallTotal++;
      if (isSameGenderClass) genderTotal++;

      const runnerAG = runner.ag || runner.g;
      const isSameAG = isSameGenderClass && runnerAG === targetAG;
      if (isSameAG) ageGroupTotal++;

      if (runner.r === target.r) continue; // skip self

      const runnerCpIdx = checkpointOrder.indexOf(runner.lc);
      const runnerTime = parseElapsedSeconds(runner.t);

      // A runner is ahead if:
      // 1. At a higher checkpoint, OR
      // 2. At the same checkpoint with less elapsed time (faster)
      const isAhead =
        runnerCpIdx > targetCpIdx ||
        (runnerCpIdx === targetCpIdx && runnerTime < targetTime);

      if (isAhead) {
        overallAhead++;
        if (isSameGenderClass) genderAhead++;
        if (isSameAG) ageGroupAhead++;
      }
    }
  }

  return {
    genderPos: genderAhead + 1,
    genderTotal,
    overallPos: overallAhead + 1,
    overallTotal,
    ageGroupPos: ageGroupAhead + 1,
    ageGroupTotal,
  };
}
