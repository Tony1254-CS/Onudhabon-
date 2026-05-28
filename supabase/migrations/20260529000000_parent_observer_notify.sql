-- Migration: Allow a linked observer (parent) to insert notifications for their linked student
-- This parallels the existing "notif_insert_teacher_for_student" policy intent.

CREATE POLICY "parent_observer_can_notify"
ON notifications
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM student_links
    WHERE student_links.observer_id = auth.uid()
      AND student_links.student_id = notifications.user_id
  )
);
