module.exports = (sequelize, DataTypes) => {
  const EventDay = sequelize.define('EventDay', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    dayDate: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    timestamps: true,
    tableName: 'event_days'
  });

  EventDay.associate = (models) => {
    EventDay.belongsTo(models.Event, { foreignKey: 'eventId', as: 'Event' });
    EventDay.hasMany(models.Session, { foreignKey: 'eventDayId', as: 'Sessions' });
  };

  return EventDay;
};














