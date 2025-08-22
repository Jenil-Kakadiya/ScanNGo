
module.exports = (sequelize, DataTypes) => {
  const event = sequelize.define('event', {
    id: {
      type: DataTypes.INTEGER(32),
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true   
    },
    status: {
      type: DataTypes.ENUM('active', 'completed'),
      allowNull: true,
      defaultValue: 'active'
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true
    },
    date: {
      type: DataTypes.STRING,
      allowNull: true
    },
    time: {
      type: DataTypes.STRING,
      allowNull: true
    },
    organizerId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    creatorEmail : {
      type: DataTypes.STRING,
      allowNull: false
    },
  },
   {
    timestamps: true,
    tableName: 'events'
  });

  event.associate = (models) => {
    event.belongsTo(models.User, { foreignKey: 'organizerId' });
  };
  return event;
};