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
      allowNull: true,
      defaultValue: "",
    },
    universityRollNo: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "333"
    },
    mobileNo: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      validate: { isNumeric: true }
    },
    department: {
      type: DataTypes.ENUM('ICT', 'CSE'),
      allowNull: true,
      defaultValue: "ICT"
    },
    batch: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "2023-2024",
      validate: { is: /^\d{4}-\d{4}$/ }
    },
    password: { type: DataTypes.STRING, allowNull: false },
    role: {
      type: DataTypes.ENUM('user', 'delegate'),
      allowNull: false,
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.INTEGER(2),
      allowNull: false,
      defaultValue: 1
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
    User.hasMany(models.Event, { foreignKey: 'organizerId' });
    User.hasMany(models.Registration, { foreignKey: 'userId' });
    User.hasMany(models.Attendance, { foreignKey: 'markedBy', as: 'MarkedAttendances' });
  };

  return User;
};
