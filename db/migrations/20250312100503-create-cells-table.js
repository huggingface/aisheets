/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    return queryInterface.createTable('cells', {
      id: {
        type: Sequelize.DataTypes.UUID,
        defaultValue: Sequelize.DataTypes.UUIDV4,
        primaryKey: true,
      },
      idx: {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: false,
      },
      value: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      error: {
        type: Sequelize.DataTypes.STRING,
        allowNull: true,
      },
      validated: {
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
      },
      generating: {
        type: Sequelize.DataTypes.BOOLEAN,
        defaultValue: false,
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
    return queryInterface.dropTable('cells');
  },
};
