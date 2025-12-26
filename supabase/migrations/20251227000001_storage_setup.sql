-- Create a bucket for tributes
INSERT INTO storage.buckets (id, name, public)
VALUES ('tributes', 'tributes', true)
ON CONFLICT (id) DO NOTHING;

-- Set up access controls for the tributes bucket
-- Allow public access to read files
CREATE POLICY "Public Access" ON storage.objects
  FOR SELECT USING (bucket_id = 'tributes');

-- Allow authenticated users to upload files
CREATE POLICY "Admin Upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tributes' AND auth.role() = 'authenticated');

-- Allow authenticated users to update their files
CREATE POLICY "Admin Update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'tributes' AND auth.role() = 'authenticated');

-- Allow authenticated users to delete their files
CREATE POLICY "Admin Delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'tributes' AND auth.role() = 'authenticated');
