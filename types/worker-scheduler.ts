export interface WorkerSchedulerConfig {
  syncEnabled: boolean;
  syncIntervalMinutes: number;
  downloadEnabled: boolean;
  downloadIntervalMinutes: number;
  downloadBatchSize: number;
  alertWebhookUrl: string;
  authBound: boolean;
  authBoundAt: number | null;
}

export interface WorkerSchedulerState {
  syncRunning: boolean;
  downloadRunning: boolean;
  lastSyncStartedAt: number | null;
  lastSyncFinishedAt: number | null;
  lastSyncSummary: string;
  lastSyncError: string;
  nextSyncAt: number | null;
  lastDownloadStartedAt: number | null;
  lastDownloadFinishedAt: number | null;
  lastDownloadSummary: string;
  lastDownloadError: string;
  nextDownloadAt: number | null;
}

export interface WorkerSchedulerStats {
  trackedAccounts: number;
  trackedArticles: number;
  downloadedHtmlArticles: number;
}

export interface WorkerSchedulerSnapshot {
  config: WorkerSchedulerConfig;
  state: WorkerSchedulerState;
  stats: WorkerSchedulerStats;
}
