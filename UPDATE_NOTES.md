# Together attachment and media update

## Included
- Send up to 10 photos and/or documents in one selection.
- Image-only and file-only messages are supported.
- Optional text is attached to the first selected item.
- Desktop drag-and-drop attachment support.
- Attachment preview strip with individual removal and Remove all.
- Batch upload progress indicator.
- Shared Media now includes Photos, Files, Voice, and Links.
- Newest shared items appear first.
- Lazy-loaded chat and gallery images.
- Existing message search, pagination, calling, reactions, replies, pins, and timeline remain intact.

## Supabase
Run `ATTACHMENTS_SETUP.sql` once if it has not already been executed.
The existing `chat-images` bucket is reused for images and documents.

## Limits
- Maximum 10 attachments per send.
- Images: up to 10 MB each.
- Documents: up to 25 MB each.
