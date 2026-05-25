-- Set all existing orgs to beta plan with unlimited credits
update hunter_orgs
set plan = 'beta', credits_total = 999999
where true;

-- Ensure future orgs default to beta during this period
alter table hunter_orgs
  alter column plan set default 'beta',
  alter column credits_total set default 999999;
