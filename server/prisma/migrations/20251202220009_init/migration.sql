DO $$
BEGIN
  -- Only adjust defaults if the columns already exist (older databases may not have them yet).
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Resource' AND column_name = 'tags') THEN
    ALTER TABLE "Resource" ALTER COLUMN "tags" DROP DEFAULT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Resource' AND column_name = 'fileSize') THEN
    ALTER TABLE "Resource" ALTER COLUMN "fileSize" DROP DEFAULT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Resource' AND column_name = 'mimeType') THEN
    ALTER TABLE "Resource" ALTER COLUMN "mimeType" DROP DEFAULT;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Resource' AND column_name = 'updatedAt') THEN
    ALTER TABLE "Resource" ALTER COLUMN "updatedAt" DROP DEFAULT;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Session' AND column_name = 'lastUsedAt') THEN
    ALTER TABLE "Session" ALTER COLUMN "lastUsedAt" DROP DEFAULT;
  END IF;
END $$;
