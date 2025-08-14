const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER(32),
      primaryKey: true,
      autoIncrement: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isEmail: true
      }
    },
    mobileNo: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: {
        isNumeric: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    role : {
      type: DataTypes.ENUM('user', 'admin'),
      allowNull: false,
      defaultValue: 'user'
    },
  }, {
    hooks: {
      beforeCreate: async (user) => {
        if (user.password && user.authType === 'credentials') {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    },
    timestamps: false,
    tableName: 'users'
  });

  // Instance method to check password
  User.prototype.comparePassword = async function(candidatePassword) {
    if (this.authType !== 'credentials') {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  };


  return User;
};