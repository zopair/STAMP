CREATE UNIQUE INDEX IF NOT EXISTS payment_orders_instapay_reference_unique ON payment_orders(transfer_reference) WHERE method='instapay' AND transfer_reference IS NOT NULL;
