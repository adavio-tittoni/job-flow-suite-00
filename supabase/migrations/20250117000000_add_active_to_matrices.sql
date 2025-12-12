-- Migration to add active field to matrices table
-- This allows matrices to be activated or deactivated

-- Add active column to matrices table
ALTER TABLE matrices 
ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE NOT NULL;

-- Create index for better query performance when filtering by active status
CREATE INDEX IF NOT EXISTS idx_matrices_active ON matrices(active);

-- Add comment to the column
COMMENT ON COLUMN matrices.active IS 'Indicates if the matrix is active (true) or inactive (false)';
