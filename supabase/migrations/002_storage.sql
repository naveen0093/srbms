-- Private buckets for employee documents and vehicle photos/videos (files; DB keeps only the path)
insert into storage.buckets(id,name,public) values ('employee-docs','employee-docs',false),('vehicle-media','vehicle-media',false) on conflict do nothing;
drop policy if exists docs_staff on storage.objects;
create policy docs_staff on storage.objects for all
 using (bucket_id in ('employee-docs','vehicle-media') and is_staff())
 with check (bucket_id in ('employee-docs','vehicle-media') and is_staff());
drop policy if exists veh_emp_upload on storage.objects;
create policy veh_emp_upload on storage.objects for insert with check (bucket_id='vehicle-media' and my_role()='employee');
