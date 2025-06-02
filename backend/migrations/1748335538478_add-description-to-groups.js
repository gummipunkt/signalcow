    /* eslint-disable camelcase */

    exports.shorthands = undefined;

    exports.up = pgm => {
      pgm.addColumns('groups', {
        description: { type: 'text', allowNull: true } // Oder varchar(255) etc., je nachdem was du brauchst
      });
    };

    exports.down = pgm => {
      pgm.dropColumns('groups', ['description']);
    };
