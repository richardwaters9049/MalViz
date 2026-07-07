import type { FileStatus } from "@prisma/client";

export type ScanListFilters = {
  status?: FileStatus;
};
