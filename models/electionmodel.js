'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class electionModel extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static addElection({ electionName, adminID, url }) {
      return this.create({
        electionName,
        url,
        adminID,
      });
    }

    static launchElection(id) {
      return this.update(
        {
          launch: true,
        },
        {
          returning: true,
          where: {
            id,
          },
        }
      );
    }

    static getElections(adminID) {
      return this.findAll({
        where: {
          adminID,
        },
        order: [["id", "ASC"]],
      });
    }

    static getElection(id) {
      return this.findOne({
        where: {
          id,
        },
      });
    }

    static getElectionURL(url) {
      return this.findOne({
        where: {
          url,
        },
      });
    }

    static associate(models) {
      // define association here
      electionModel.belongsTo(models.adminModel, {
        foreignKey: "adminID",
      });

      electionModel.hasMany(models.questionsModel, {
        foreignKey: "electionID",
      });

      electionModel.hasMany(models.voterModel, {
        foreignKey: "electionID",
      });
    }
  }
  electionModel.init({
    electionName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    launch: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    stop: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    }
  }, {
    sequelize,
    modelName: 'electionModel',
  });
  return electionModel;
};