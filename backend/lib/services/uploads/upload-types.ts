export type UploadSuccess = {
  fileId: string;
  scanJobId?: string | null;
  originalFilename: string;
  status: string;
  warnings: string[];
};

export type UploadFailure = {
  filename: string;
  error: string;
};

export type UploadResult = {
  uploads: UploadSuccess[];
  failures: UploadFailure[];
};
