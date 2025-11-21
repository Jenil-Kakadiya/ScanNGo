module.exports = (sequelize, DataTypes) => {
  const EventCertificateRequirement = sequelize.define('EventCertificateRequirement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    timestamps: true,
    tableName: 'event_certificate_requirements',
    indexes: [
      {
        unique: true,
        fields: ['eventId', 'sessionId']
      }
    ]
  });

  EventCertificateRequirement.associate = (models) => {
    EventCertificateRequirement.belongsTo(models.Event, { foreignKey: 'eventId', as: 'Event' });
    EventCertificateRequirement.belongsTo(models.Session, { foreignKey: 'sessionId', as: 'Session' });
  };

  return EventCertificateRequirement;
};











