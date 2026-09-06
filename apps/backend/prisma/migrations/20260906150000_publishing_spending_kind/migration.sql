-- Commit the new enum value before the following migration uses it in checks.
ALTER TYPE "PointChangeKind" ADD VALUE 'PUBLISHING_ORDER';
