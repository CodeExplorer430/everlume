#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { loadLocalEnv } from './load-env.mjs';

loadLocalEnv();

const enabled = process.env.MEDIA_PREWARM_ENABLED === '1';
if (!enabled) {
  console.log('media prewarm disabled (set MEDIA_PREWARM_ENABLED=1 to enable)');
  process.exit(0);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const batchSize = Number(process.env.MEDIA_PREWARM_BATCH_SIZE || '40');

if (!supabaseUrl || !serviceRoleKey || !cloudName) {
  console.error('missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY), NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME');
  process.exit(1);
}

const widths = [400, 800, 1200];
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function buildUrl(publicId, width) {
  return `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_${width},q_auto,f_auto/${publicId}`;
}

const { data: photos, error: photosError } = await supabase
  .from('photos')
  .select('id, cloudinary_public_id')
  .not('cloudinary_public_id', 'is', null)
  .limit(batchSize);

if (photosError) {
  console.error('failed to load photos', photosError.message);
  process.exit(1);
}

let successCount = 0;
let partialCount = 0;
let errorCount = 0;

for (const photo of photos || []) {
  const publicId = photo.cloudinary_public_id;
  const results = [];

  for (const width of widths) {
    const url = buildUrl(publicId, width);
    try {
      const response = await fetch(url, { method: 'GET', cache: 'no-store' });
      results.push({ width, ok: response.ok, status: response.status });
    } catch {
      results.push({ width, ok: false, status: 0 });
    }
  }

  const okCount = results.filter((item) => item.ok).length;
  const status = okCount === results.length ? 'success' : okCount > 0 ? 'partial' : 'error';
  if (status === 'success') successCount += 1;
  if (status === 'partial') partialCount += 1;
  if (status === 'error') errorCount += 1;

  const { error: insertError } = await supabase.from('media_optimization_runs').insert({
    photo_id: photo.id,
    status,
    details: {
      transforms: results,
      warmed_at: new Date().toISOString(),
    },
  });

  if (insertError) {
    console.error(`failed to write optimization run for photo ${photo.id}: ${insertError.message}`);
  }
}

console.log(
  JSON.stringify(
    {
      checked: photos?.length || 0,
      success: successCount,
      partial: partialCount,
      error: errorCount,
    },
    null,
    2
  )
);
