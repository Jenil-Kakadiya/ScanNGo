module.exports = (sequelize, DataTypes) => {
  const Registration = sequelize.define('Registration', {
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
    tableName: 'registrations',
    indexes: [
      {
        unique: true,
        fields: ['eventId', 'userId']
      }
    ]
  });

  Registration.associate = (models) => {
    Registration.belongsTo(models.Event, { foreignKey: 'eventId', as: 'Event' });
    Registration.belongsTo(models.User, { foreignKey: 'userId', as: 'User' });
    Registration.hasMany(models.Attendance, { foreignKey: 'registrationId', as: 'Attendances' });
  };

  return Registration;
};
