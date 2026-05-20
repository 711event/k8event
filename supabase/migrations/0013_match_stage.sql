-- Add stage label to matches table
ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage TEXT;

-- Backfill all existing matches by their kickoff time (stored in UTC)
-- GMT+8 boundaries converted to UTC:
--   Group Stage:  < 2026-06-29 03:00 SGT  = < 2026-06-28 19:00 UTC
--   Round of 32:  2026-06-29 03:00 → 2026-07-05 01:00 SGT
--   Round of 16:  2026-07-05 01:00 → 2026-07-09 05:00 SGT
--   Quarter-final: 2026-07-09 05:00 → 2026-07-14 05:00 SGT
--   Semi-final:   2026-07-14 05:00 → 2026-07-19 05:00 SGT
--   Third-place:  2026-07-19 05:00 SGT
--   Final:        2026-07-20 03:00 SGT

UPDATE matches SET stage = 'Group Stage'
  WHERE kickoff_at < '2026-06-28T19:00:00Z';

UPDATE matches SET stage = 'Round of 32'
  WHERE kickoff_at >= '2026-06-28T19:00:00Z'
    AND kickoff_at <  '2026-07-04T17:00:00Z';

UPDATE matches SET stage = 'Round of 16'
  WHERE kickoff_at >= '2026-07-04T17:00:00Z'
    AND kickoff_at <  '2026-07-08T21:00:00Z';

UPDATE matches SET stage = 'Quarter-final'
  WHERE kickoff_at >= '2026-07-08T21:00:00Z'
    AND kickoff_at <  '2026-07-13T21:00:00Z';

UPDATE matches SET stage = 'Semi-final'
  WHERE kickoff_at >= '2026-07-13T21:00:00Z'
    AND kickoff_at <  '2026-07-18T21:00:00Z';

UPDATE matches SET stage = 'Third-place'
  WHERE kickoff_at >= '2026-07-18T21:00:00Z'
    AND kickoff_at <  '2026-07-19T19:00:00Z';

UPDATE matches SET stage = 'Final'
  WHERE kickoff_at >= '2026-07-19T19:00:00Z';
