class CreateReports < ActiveRecord::Migration[7.0]
    def change
        create_table :reports do |t|
        t.references :post, null: false, foreign_key: true
        t.references :user, foreign_key: true  # nullable car utilisateur peut être non connecté
        t.text :comment, null: false
        t.string :status, default: 'pending'   # pending, reviewed, dismissed
        t.timestamps
        end
    end
end