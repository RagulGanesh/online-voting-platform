'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class questionsModel extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static async getNumberOfQuestionss(electionID) {
      return await this.count({
        where: {
          electionID,
        },
      });
    }

    static updateAQuestion({ questionName, description, id }) {
      return this.update(
        {
          questionName,
          description,
        },
        {
          returning: true,
          where: {
            id,
          },
        }
      );
    }

    static addAQuestion({ questionName, description, electionID }) {
      return this.create({
        questionName,
        description,
        electionID,
      });
    }

    static async getQuestion(id) {
      return await this.findOne({
        where: {
          id,
        },
      });
    }

    static deleteAQuestion(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

    static async getQuestionss(electionID) {
      return await this.findAll({
        where: {
          electionID,
        },
        order: [["id", "ASC"]],
      });
    }

    static associate(models) {
      // define association here
      questionsModel.belongsTo(models.electionModel, {
        foreignKey: "electionID",
      });

      questionsModel.hasMany(models.optionModel, {
        foreignKey: "questionID",
      });
    }
  }
  questionsModel.init({
    questionName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'questionsModel',
  });
  return questionsModel;
};