export interface ExecutionStat {
  id: number;
  library: string;
  preVersion: string;
  postVersion: string;
  totalFailureDirs: number;
  patternAnalyzedClientsCount: number;
  createdPatternCount: number;
  failureDetectedClientsCount: number;
  failureValid: number;
  failureNoTest: number;
  failureStandard: number;
  failureNoScript: number;
  failureNoPkg: number;
  totalSuccessDirs: number;
  successDetectedClientsCount: number;
  successUsedPatternCount: number;
  successValid: number;
  successNoTest: number;
  successStandard: number;
  successNoScript: number;
  successNoPkg: number;
  outputPath: string;
}

export const CSV_HEADER =
  'ID,Library,PreVersion,PostVersion,ClonedFailureCount,PatternAnalyzedClients,CreatedPatternsCount,' +
  'FailureDetectedCount,FailureValid,FailureNoTest,FailureStandard,FailureNoScript,FailureNoPkg,' +
  'ClonedSuccessCount,SuccessDetectedCount,SuccessUsedPatternCount,' +
  'SuccessValid,SuccessNoTest,SuccessStandard,SuccessNoScript,SuccessNoPkg,OutputPath\n';

export const statToCsvRow = (stat: ExecutionStat): string =>
  `${stat.id},${stat.library},${stat.preVersion},${stat.postVersion},` +
  `${stat.totalFailureDirs},${stat.patternAnalyzedClientsCount},${stat.createdPatternCount},` +
  `${stat.failureDetectedClientsCount},${stat.failureValid},${stat.failureNoTest},${stat.failureStandard},${stat.failureNoScript},${stat.failureNoPkg},` +
  `${stat.totalSuccessDirs},${stat.successDetectedClientsCount},${stat.successUsedPatternCount},` +
  `${stat.successValid},${stat.successNoTest},${stat.successStandard},${stat.successNoScript},${stat.successNoPkg},${stat.outputPath}`;
