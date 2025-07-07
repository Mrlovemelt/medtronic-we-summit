-- Add UPDATE policy for survey_responses table
-- This allows the moderation system to update the status field

CREATE POLICY "Allow authenticated users to update survey responses"
    ON survey_responses FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true); 