// backend/migrations/001_initial_schema.js
exports.shorthands = undefined;

exports.up = (pgm) => {
  // Users table
  pgm.createTable('users', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    username: { type: 'varchar(255)', notNull: true, unique: true },
    email: { type: 'varchar(255)', notNull: true, unique: true },
    password_hash: { type: 'varchar(255)', notNull: true },
    is_admin: { type: 'boolean', default: false, notNull: true },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });

  // Groups table
  pgm.createTable('groups', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: '"users"(id)', // Foreign key to users table
      onDelete: 'CASCADE',      // If a user is deleted, their groups are also deleted
    },
    group_name: { type: 'varchar(255)', notNull: true },
    signal_group_id: { type: 'varchar(255)', unique: true, allowNull: true }, // Signal's internal group ID
    bot_phone_number: { type: 'varchar(255)', allowNull: true }, // The bot number associated, might come from user or config
    link_token: { type: 'varchar(255)', unique: true, allowNull: true },
    link_token_expires_at: { type: 'timestamp with time zone', allowNull: true },
    bot_linked_at: { type: 'timestamp with time zone', allowNull: true },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    updated_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  // Index for faster lookups on user_id in groups table
  pgm.createIndex('groups', 'user_id');


  // Webhooks table
  pgm.createTable('webhooks', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('gen_random_uuid()') },
    group_id: {
      type: 'uuid',
      notNull: true,
      references: '"groups"(id)', // Foreign key to groups table
      onDelete: 'CASCADE',       // If a group is deleted, its webhooks are also deleted
    },
    webhook_token: { type: 'varchar(255)', notNull: true, unique: true },
    description: { type: 'text', allowNull: true },
    is_active: { type: 'boolean', default: true, notNull: true },
    created_at: {
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
  });
  // Index for faster lookups on group_id in webhooks table
  pgm.createIndex('webhooks', 'group_id');
  // Index for faster lookups on webhook_token
  pgm.createIndex('webhooks', 'webhook_token');

  // Optional: Trigger to update 'updated_at' timestamp on row update for all tables
  // This requires creating a function first.
  pgm.sql(`
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
       NEW.updated_at = NOW();
       RETURN NEW;
    END;
    $$ language 'plpgsql';
  `);

  const tablesWithUpdatedAt = ['users', 'groups', 'webhooks'];
  tablesWithUpdatedAt.forEach(tableName => {
    pgm.sql(`
      CREATE TRIGGER set_updated_at
      BEFORE UPDATE ON "${tableName}"
      FOR EACH ROW
      EXECUTE PROCEDURE update_updated_at_column();
    `);
  });
};

exports.down = (pgm) => {
  // Drop tables in reverse order of creation due to foreign key constraints
  // First drop triggers if they exist
  const tablesWithUpdatedAt = ['users', 'groups', 'webhooks'];
  tablesWithUpdatedAt.forEach(tableName => {
    pgm.sql(`DROP TRIGGER IF EXISTS set_updated_at ON "${tableName}";`);
  });
  // Then drop the function
  pgm.sql(`DROP FUNCTION IF EXISTS update_updated_at_column();`);

  pgm.dropTable('webhooks');
  pgm.dropTable('groups');
  pgm.dropTable('users');
};