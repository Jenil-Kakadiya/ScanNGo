module.exports = (sequelize, DataTypes) => {
  const Session = sequelize.define('Session', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventDayId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false
    }
  }, {
    timestamps: true,
    tableName: 'sessions'
  });

  Session.associate = (models) => {
    Session.belongsTo(models.EventDay, { foreignKey: 'eventDayId', as: 'EventDay' });
    Session.hasMany(models.Attendance, { foreignKey: 'sessionId', as: 'Attendances' });
  };

  return Session;
};














