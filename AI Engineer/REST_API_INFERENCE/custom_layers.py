import tensorflow as tf


class AdaptiveAvgPool1D(tf.keras.layers.Layer):
    def __init__(self, output_size, **kwargs):
        super().__init__(**kwargs)
        self.output_size = output_size

    def call(self, inputs):
        # inputs: (batch, time, channels)
        x = tf.transpose(
            inputs,
            [0, 2, 1]
        )

        # Shape: (batch, channels, time, 1)
        x = tf.expand_dims(
            x,
            axis=-1
        )

        x = tf.image.resize(
            x,
            size=[
                tf.shape(x)[1],
                self.output_size
            ],
            method="bilinear"
        )

        # Shape: (batch, channels, output_size)
        x = tf.squeeze(
            x,
            axis=-1
        )

        # Shape: (batch, output_size, channels)
        x = tf.transpose(
            x,
            [0, 2, 1]
        )

        return x

    def get_config(self):
        config = super().get_config()

        config.update({
            "output_size": self.output_size
        })

        return config


class AdaptiveAvgPool2D(tf.keras.layers.Layer):
    def __init__(self, output_size, **kwargs):
        super().__init__(**kwargs)
        self.output_size = output_size

    def call(self, inputs):
        # inputs: (batch, height, width, channels)
        return tf.image.resize(
            inputs,
            size=self.output_size,
            method="bilinear"
        )

    def get_config(self):
        config = super().get_config()

        config.update({
            "output_size": self.output_size
        })

        return config