module.exports = (sequelize, DataTypes) => {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: DataTypes.STRING,
    description: DataTypes.TEXT,
    status: {
      type: DataTypes.ENUM('active', 'completed'),
      defaultValue: 'active'
    },
    location: DataTypes.STRING,
    // store both date + time in one field
    dateTime: {
      type: DataTypes.DATE,
      allowNull: false
    },
    organizerId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    creatorEmail: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { isEmail: true }
    }
  }, {
    timestamps: true,
    tableName: 'events'
  });

  Event.associate = (models) => {
    Event.belongsTo(models.User, { foreignKey: 'organizerId' });
    Event.hasMany(models.Registration, { foreignKey: 'eventId' });
  };

  return Event;
};
