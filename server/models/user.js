const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {  // Model name "User"
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    name: { type: DataTypes.STRING, allowNull: false },
    personalEmail: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isEmail: true }
    },
    universityEmail: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isEmail: true }
    },
    universityRollNo: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    mobileNo: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isNumeric: true }
    },
    department: {
      type: DataTypes.ENUM('ICT', 'CSE'),
      allowNull: false
    },
    batch: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { is: /^\d{4}-\d{4}$/ }
    },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user'
    }
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    },
    timestamps: true,
    tableName: 'users'  // lowercase table
  });

  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
  };

  User.associate = (models) => {
    User.hasOne(models.Contactmeta, { foreignKey: 'userId' });
  };

  return User;
};
