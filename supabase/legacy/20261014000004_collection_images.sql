-- 004: gallery images for a collection, with a caption per image.
-- Used by the /admin page and by the public collection pages.
-- The cover image stays in collections.hero_image_path.

create table collection_images (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references collections (id) on delete cascade,
  image_path text not null,          -- path inside the public-images bucket
  caption text,                      -- item name shown under the image
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  constraint collection_images_caption_length check (coalesce(char_length(caption), 0) <= 120)
);

create index collection_images_collection_id_idx on collection_images (collection_id, sort_order);

alter table collection_images enable row level security;

-- Staff manage everything.
create policy staff_all_collection_images on collection_images
  for all to authenticated using (is_staff()) with check (is_staff());

-- The public website reads the images of published collections only.
create policy public_read_collection_images on collection_images
  for select to anon, authenticated using (
    exists (select 1 from collections c where c.id = collection_images.collection_id and c.is_published)
  );

revoke all on collection_images from anon, authenticated;
grant select on collection_images to anon;
grant select, insert, update, delete on collection_images to authenticated;
