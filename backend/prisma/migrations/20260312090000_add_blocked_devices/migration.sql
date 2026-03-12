CREATE TABLE "blocked_devices" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fingerprint_hash" TEXT NOT NULL,
    "device_name" TEXT,
    "reason" TEXT,
    "blocked_by_id" TEXT,
    "blocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unblocked_at" TIMESTAMP(3),
    "is_blocked" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "blocked_devices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "blocked_devices_user_id_fingerprint_hash_key"
ON "blocked_devices"("user_id", "fingerprint_hash");

CREATE INDEX "blocked_devices_user_id_is_blocked_idx"
ON "blocked_devices"("user_id", "is_blocked");

ALTER TABLE "blocked_devices"
ADD CONSTRAINT "blocked_devices_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
