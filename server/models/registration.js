module.exports = (sequelize, DataTypes) => {
  const registration = sequelize.define('registration', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'confirmed', 'cancelled'),
      defaultValue: 'confirmed'
    },
    verificationCode: {
      type: DataTypes.STRING(32),
      allowNull: false,
      unique: true
    },
    checkedIn: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    timestamps: true,
    tableName: 'registrations'
  });

  registration.associate = (models) => {
    registration.belongsTo(models.event, { foreignKey: 'eventId' });
    registration.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return registration;
};
