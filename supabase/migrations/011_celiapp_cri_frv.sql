-- Migration 011: Add CELIAPP, CRI and FRV fields to client_info
ALTER TABLE client_info
  ADD COLUMN IF NOT EXISTS has_celiapp boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS celiapp_balance numeric(15,2),
  ADD COLUMN IF NOT EXISTS has_cri boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS cri_balance numeric(15,2),
  ADD COLUMN IF NOT EXISTS has_frv boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS frv_balance numeric(15,2);
