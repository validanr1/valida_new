-- Allow LGPD as a legal_documents tipo
alter table public.legal_documents
  drop constraint if exists legal_documents_tipo_check;

alter table public.legal_documents
  add constraint legal_documents_tipo_check
  check (tipo in ('termos','privacidade','cookies','sla','lgpd'));

-- Optionally extend user_legal_acceptance to include lgpd document type
alter table public.user_legal_acceptance
  drop constraint if exists user_legal_acceptance_documento_tipo_check;

alter table public.user_legal_acceptance
  add constraint user_legal_acceptance_documento_tipo_check
  check (documento_tipo in ('termos','privacidade','cookies','sla','lgpd'));