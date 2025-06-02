exports.shorthands = undefined;

exports.up = (pgm) => {
  console.log('[MIGRATE UP] Starting migration ADD_PASSWORD_RESET_TABLE...');

  pgm.createTable('password_reset_tokens', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"(id)', // Foreign key to users table
      onDelete: 'CASCADE',      // If a user is deleted, their reset tokens are also deleted
    },
    token_hash: { type: 'varchar(255)', notNull: true, unique: true }, // Store hashed token
    expires_at: {
      type: 'timestamp with time zone',
      notNull: true,
    },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    }
    // No updated_at needed for this table as tokens are typically single-use or expire
  });

  // Index for faster lookups on user_id
  pgm.createIndex('password_reset_tokens', 'user_id');
  // Index for faster lookups on token_hash (though unique constraint already creates one)
  // pgm.createIndex('password_reset_tokens', 'token_hash'); // Redundant due to unique:true on token_hash

  console.log('[MIGRATE UP] Migration ADD_PASSWORD_RESET_TABLE finished.');
};

exports.down = (pgm) => {
  console.log('[MIGRATE DOWN] Starting DOWN migration ADD_PASSWORD_RESET_TABLE...');
  pgm.dropTable('password_reset_tokens');
  console.log('[MIGRATE DOWN] DOWN migration ADD_PASSWORD_RESET_TABLE finished.');
}; 