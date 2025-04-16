/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */

    await queryInterface.createTable(
      'process_referred_columns',
      {
        processId: {
          type: Sequelize.DataTypes.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'processes',
            },
            key: 'id',
          },
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
      },
      {
        uniqueKeys: {
          process_referred_columns_unique: {
            fields: ['processId', 'columnId'],
          },
        },
      },
    );
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
