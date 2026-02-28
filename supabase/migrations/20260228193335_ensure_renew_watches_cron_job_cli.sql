-- Ensure renew-gmail-watches cron job exists with canonical definition
do $$
declare
  desired_schedule text := '0 2 * * *';
  desired_command text := 'SELECT public.renew_gmail_watches()';
  existing_job_id bigint;
  existing_schedule text;
  existing_command text;
begin
  select
    jobid,
    schedule,
    regexp_replace(command, '\s+', ' ', 'g')
  into
    existing_job_id,
    existing_schedule,
    existing_command
  from cron.job
  where jobname = 'renew-gmail-watches'
  limit 1;

  if existing_job_id is null then
    perform cron.schedule('renew-gmail-watches', desired_schedule, desired_command);
    raise log 'Created cron job renew-gmail-watches: schedule=%, command=%', desired_schedule, desired_command;
    return;
  end if;

  if existing_schedule <> desired_schedule or trim(existing_command) <> desired_command then
    perform cron.unschedule(existing_job_id);
    perform cron.schedule('renew-gmail-watches', desired_schedule, desired_command);
    raise log 'Recreated cron job renew-gmail-watches: old_job_id=%, schedule=%, command=%', existing_job_id, desired_schedule, desired_command;
  else
    raise log 'Cron job renew-gmail-watches already configured correctly';
  end if;
end $$;
