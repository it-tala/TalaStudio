-- 005: items shown from several angles and in several finishes (colours).
-- Structure: collection (collections) > item, e.g. bed or dresser (products) > images (product_images).
-- Each image has an angle and, once an item comes in more than one colour, a finish.

alter table product_images
  add column angle text,
  add column finish text,            -- one of the item's products.finishes; null while it has only one
  add constraint product_images_angle_check
    check (angle in ('three-quarter', 'front', 'side', 'back', 'top', 'detail', 'in-room')),
  add constraint product_images_finish_length check (coalesce(char_length(finish), 0) <= 60);

-- Items go in as renders arrive, before their codes are final. Still unique once filled in.
alter table products alter column sku drop not null;
