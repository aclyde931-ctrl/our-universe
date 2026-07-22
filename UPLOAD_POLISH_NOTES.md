# Upload polish

Attachment uploads now use a staged, smooth progress experience:

- Preparing attachments
- Uploading the current file
- Finishing up while the message record is saved
- Sent confirmation

For multiple attachments, the UI displays the current filename and its position in the queue.

Note: Supabase Storage's standard JavaScript upload method does not expose byte-level progress events. The percentage is therefore a smooth staged indicator tied to real upload and database completion, rather than a byte-accurate network meter. It will never show 100% until the upload and message insert have both succeeded.
