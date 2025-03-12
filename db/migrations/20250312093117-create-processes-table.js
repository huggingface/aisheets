/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    return queryInterface.createTable('processes', {
      id: {
        type: Sequelize.DataTypes.UUID,
        defaultValue: Sequelize.DataTypes.UUIDV4,
        primaryKey: true,
      },
      modelName: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      modelProvider: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      prompt: {
        type: Sequelize.DataTypes.STRING,
        allowNull: false,
      },
      offset: {
        type: Sequelize.DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false,
      },
      limit: {
        type: Sequelize.DataTypes.INTEGER,
        defaultValue: 10,
        allowNull: false,
      },
      columnId: {
        type: Sequelize.DataTypes.UUID,
        allowNull: false,
        references: {
          model: {
            tableName: 'columns',
          },
          key: 'id',
        },
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
    return queryInterface.dropTable('processes');
  },
};
