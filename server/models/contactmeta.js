module.exports = (sequelize, DataTypes) => {
    const Contactmeta = sequelize.define('Contactmeta', {  // Model name "Contactmeta"
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      meta: {
        type: DataTypes.JSON,
        allowNull: true
      }
    }, {
      timestamps: true,
      tableName: 'contactmeta'  // lowercase table
    });
  
    Contactmeta.associate = (models) => {
      Contactmeta.belongsTo(models.User, { foreignKey: 'userId' });
    };
  
    return Contactmeta;
  };
  