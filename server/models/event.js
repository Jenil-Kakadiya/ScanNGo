module.exports = (sequelize, DataTypes) => {
  const event = sequelize.define('event', {
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

  event.associate = (models) => {
    event.belongsTo(models.User, { foreignKey: 'organizerId' });
    event.hasMany(models.registration, { foreignKey: 'eventId' });
  };

  return event;
};
