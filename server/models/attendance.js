module.exports = (sequelize, DataTypes) => {
  const Attendance = sequelize.define('Attendance', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    registrationId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('present', 'absent'),
      defaultValue: 'absent'
    },
    markedBy: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    markedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    timestamps: false,
    tableName: 'attendance'
  });

  Attendance.associate = (models) => {
    Attendance.belongsTo(models.Registration, { foreignKey: 'registrationId', as: 'Registration' });
    Attendance.belongsTo(models.Session, { foreignKey: 'sessionId', as: 'Session' });
    Attendance.belongsTo(models.User, { foreignKey: 'markedBy', as: 'MarkedByUser' });
  };

  return Attendance;
};









