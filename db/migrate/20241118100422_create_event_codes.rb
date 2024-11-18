class CreateEventCodes < ActiveRecord::Migration[7.0]
  def change
    create_table :event_codes do |t|
      t.string :code
      t.string :text
      t.string :link
      t.string :color

      t.timestamps
    end
  end
end
