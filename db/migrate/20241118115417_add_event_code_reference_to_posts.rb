class AddEventCodeReferenceToPosts < ActiveRecord::Migration[7.0]
    def change
      add_reference :posts, :event_code, foreign_key: true, null: true
    end
  end