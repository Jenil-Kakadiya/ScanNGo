
module.exports = (sequelize, DataTypes) => {
  const registration = sequelize.define('registration', {
    id: {
      type: DataTypes.INTEGER(32),
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    verificationCode: {
      type: DataTypes.STRING,
      allowNull: true
    }
  },
   {
    timestamps: true,
    tableName: 'registrations'
  });

  registration.associate = (models) => {
    registration.belongsTo(models.event, { foreignKey: 'eventId' });
    registration.belongsTo(models.User, { foreignKey: 'userId' });
  };
  return registration;
};












